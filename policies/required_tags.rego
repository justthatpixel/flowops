package flowops.required_tags

# All taggable resources must carry these tags.
# Values can be anything non-empty.
required_tags := {"Project", "Environment", "Owner"}

# Resource types that support tags (subset — extend as needed).
taggable_types := {
  "aws_ecs_service",
  "aws_ecs_cluster",
  "aws_db_instance",
  "aws_rds_cluster",
  "aws_elasticache_cluster",
  "aws_lb",
  "aws_s3_bucket",
  "aws_lambda_function",
  "aws_sqs_queue",
  "aws_dynamodb_table",
  "aws_vpc",
  "aws_subnet",
  "aws_nat_gateway",
  "aws_cloudfront_distribution",
}

deny[msg] {
  resource     := input.resource_changes[_]
  taggable_types[resource.type]
  resource.change.actions[_] == "create"
  tags         := object.get(resource.change.after, "tags", {})
  missing_tag  := required_tags[_]
  not tags[missing_tag]
  msg := sprintf(
    "Resource '%v' (%v) is missing required tag '%v'. All resources must have: Project, Environment, Owner.",
    [resource.address, resource.type, missing_tag]
  )
}
