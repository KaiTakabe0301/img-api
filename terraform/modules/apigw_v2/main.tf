terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      configuration_aliases = [ aws ]
    }
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = var.name
  protocol_type = "HTTP"
}

# POST /images
resource "aws_apigatewayv2_integration" "post" {
  api_id                   = aws_apigatewayv2_api.http.id
  integration_type         = "AWS_PROXY"
  integration_uri          = var.lambda_upload_uri
  payload_format_version   = "2.0"
}

resource "aws_apigatewayv2_route" "post" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /images"
  target    = "integrations/${aws_apigatewayv2_integration.post.id}"
}

# GET /images/{id}
resource "aws_apigatewayv2_integration" "get" {
  api_id                   = aws_apigatewayv2_api.http.id
  integration_type         = "AWS_PROXY"
  integration_uri          = var.lambda_get_uri
  payload_format_version   = "2.0"
}

resource "aws_apigatewayv2_route" "get" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /images/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.get.id}"
}

# Stage ($default)
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

output "invoke_url"    { value = aws_apigatewayv2_stage.default.invoke_url }
output "execution_arn" { value = aws_apigatewayv2_api.http.execution_arn }