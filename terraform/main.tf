############################
#  S3 バケット
############################
resource "aws_s3_bucket" "images" {
  bucket = "img-api-bucket"
}

############################
#  IAM ロール + ポリシー
############################
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "img_api_lambda_role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {     # ★ 追加
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

############################
#  Lambda Functions
############################
resource "aws_lambda_function" "image_handler" {
  function_name = "img-api-handler"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs20.x"
  handler       = "src/handler.upload"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size   = 512
  timeout       = 30
  environment { variables = { BUCKET = aws_s3_bucket.images.bucket } }
}

resource "aws_lambda_function" "image_getter" {
  function_name = "img-api-getter"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs20.x"
  handler       = "src/handler.get"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size   = 512
  timeout       = 30
  environment { variables = { BUCKET = aws_s3_bucket.images.bucket } }
}

resource "aws_lambda_function" "images_list" {
  function_name = "img-api-list"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs20.x"
  handler       = "src/handler.getImages"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size   = 512
  timeout       = 30
  environment { variables = { BUCKET = aws_s3_bucket.images.bucket } }
}

############################
#  API Gateway モジュール
############################
module "apigw_v1" {
    providers = {
      aws = aws
    }
  source              = "./modules/apigw_v1"
  count               = var.use_localstack ? 1 : 0
  name                = "img-api"
  lambda_upload_uri   = aws_lambda_function.image_handler.invoke_arn
  lambda_get_uri      = aws_lambda_function.image_getter.invoke_arn
  lambda_list_uri     = aws_lambda_function.images_list.invoke_arn
  redeploy_trigger    = data.archive_file.lambda_zip.output_base64sha256
}

module "apigw_v2" {

    providers = {
      aws = aws
    }
  source              = "./modules/apigw_v2"
  count               = var.use_localstack ? 0 : 1
  name                = "img-api"
  lambda_upload_uri   = aws_lambda_function.image_handler.invoke_arn
  lambda_get_uri      = aws_lambda_function.image_getter.invoke_arn
  lambda_list_uri     = aws_lambda_function.images_list.invoke_arn
}

############################
#  共通値 (invoke URL / exec ARN)
############################
locals {
  api_invoke_url  = var.use_localstack ? "http://${module.apigw_v1[0].rest_api_id}.execute-api.localhost.localstack.cloud:4566/${module.apigw_v1[0].stage_name}" : module.apigw_v2[0].invoke_url
  api_exec_arn    = var.use_localstack ? module.apigw_v1[0].execution_arn : module.apigw_v2[0].execution_arn
}

############################
#  Lambda Permissions
############################
resource "aws_lambda_permission" "allow_upload" {
  statement_id  = "AllowInvokeUpload"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.api_exec_arn}/*/*"
}

resource "aws_lambda_permission" "allow_get" {
  statement_id  = "AllowInvokeGet"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_getter.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.api_exec_arn}/*/*"
}

resource "aws_lambda_permission" "allow_list" {
  statement_id  = "AllowInvokeList"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.images_list.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.api_exec_arn}/*/*"
}

############################
# LogGroup Resources
############################
resource "aws_cloudwatch_log_group" "handler_logs" {
  name              = "/aws/lambda/${aws_lambda_function.image_handler.function_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = null     # 必要なら CMK を設定
}

# ★ Getter 用
resource "aws_cloudwatch_log_group" "getter_logs" {
  name              = "/aws/lambda/${aws_lambda_function.image_getter.function_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = null
}

# ★ List 用
resource "aws_cloudwatch_log_group" "list_logs" {
  name              = "/aws/lambda/${aws_lambda_function.images_list.function_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = null
}
