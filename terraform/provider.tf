# provider.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"          # 4.66 以上なら OK
    }
  }
}

provider "aws" {
  region            = var.use_localstack ? "us-east-1" : var.region
  access_key        = var.use_localstack ? "test" : null
  secret_key        = var.use_localstack ? "test" : null
  s3_use_path_style = var.use_localstack

  ### ← ここを “ブロック” で書く ###
  endpoints {
    s3         = var.use_localstack ? "http://localhost:4566" : null
    lambda     = var.use_localstack ? "http://localhost:4566" : null
    apigateway = var.use_localstack ? "http://localhost:4566" : null
    iam        = var.use_localstack ? "http://localhost:4566" : null
    sts        = var.use_localstack ? "http://localhost:4566" : null
    ecr        = var.use_localstack ? "http://localhost:4566" : null
  }
}