output "api_invoke_url" {
  value = local.api_invoke_url
}

output "bucket_name" {
  value = aws_s3_bucket.images.bucket
}