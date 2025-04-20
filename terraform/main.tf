# S3 バケット（オリジナル画像 / 変換後画像）
resource "aws_s3_bucket" "images" {
  bucket = "img-api-bucket"
}

# Lambda・IAM ロール
resource "aws_iam_role" "lambda_role" {
  name               = "img_api_lambda_role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

# Lambda
resource "aws_lambda_function" "image_handler" {
  function_name = "img-api-handler"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs20.x"
  handler       = "src/handler.upload"            # POST 用
  filename      = data.archive_file.lambda_zip.output_path
  memory_size   = 512
  timeout       = 30
  environment {
    variables = {
      BUCKET = aws_s3_bucket.images.bucket
    }
  }
}

# もう一つ (GET) を別エントリポイントで
resource "aws_lambda_function" "image_getter" {
  function_name = "img-api-getter"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs20.x"
  handler       = "src/handler.get"               # GET 用
  filename      = data.archive_file.lambda_zip.output_path
  memory_size   = 512
  timeout       = 30
  environment {
    variables = {
      BUCKET = aws_s3_bucket.images.bucket
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "http_api" {
  name          = "img-api"
  protocol_type = "HTTP"
}

# ルート
resource "aws_apigatewayv2_route" "post_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /images"
  target    = "integrations/${aws_apigatewayv2_integration.post_integration.id}"
}

resource "aws_apigatewayv2_route" "get_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /images/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.get_integration.id}"
}

# Lambda 統合
resource "aws_apigatewayv2_integration" "post_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.image_handler.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "get_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.image_getter.invoke_arn
  payload_format_version = "2.0"
}

# デプロイ
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

# Lambda → API の権限付与
resource "aws_lambda_permission" "allow_post" {
  statement_id  = "AllowAPIGatewayInvokePost"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_get" {
  statement_id  = "AllowAPIGatewayInvokeGet"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_getter.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}