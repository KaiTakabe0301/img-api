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

############################
#  Lambda Functions
############################
resource "aws_lambda_function" "image_handler" {
  function_name = "img-api-handler"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs20.x"
  handler       = "src/handler.upload"
  filename      = data.archive_file.lambda_zip.output_path
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
}

############################
#  共通値 (invoke URL / exec ARN)
############################
locals {
  api_invoke_url  = var.use_localstack ? module.apigw_v1[0].invoke_url : module.apigw_v2[0].invoke_url
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