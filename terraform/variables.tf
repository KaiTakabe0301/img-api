variable "env" {
  description = "Environment name: local | ci | prod"
  type        = string
  default     = "local"
}

variable "use_localstack" {
  description = "true = LocalStack / false = real AWS"
  type        = bool
  default     = true         # CI・prod では -var='use_localstack=false'
}

variable "region" {
  description = "AWS region when not using LocalStack"
  type        = string
  default     = "us-east-1"
}

variable "localstack_endpoint" {
  description = "LocalStack edge endpoint"
  type        = string
  default     = "http://localhost:4566"
}

variable "log_group_name" {
  description = "Name of the CloudWatch LogGroup"
  type        = string
  default     = "/ecs/img-api"
}