package flowops.allowed_resources

# Allowlist — only these AWS resource types may be created.
# Anything outside this list requires an explicit policy override.
allowed_types := {
  "aws_ecs_service",
  "aws_ecs_cluster",
  "aws_ecs_task_definition",
  "aws_db_instance",
  "aws_rds_cluster",
  "aws_elasticache_cluster",
  "aws_elasticache_replication_group",
  "aws_lb",
  "aws_lb_listener",
  "aws_lb_target_group",
  "aws_cloudfront_distribution",
  "aws_s3_bucket",
  "aws_s3_bucket_server_side_encryption_configuration",
  "aws_s3_bucket_public_access_block",
  "aws_lambda_function",
  "aws_api_gateway_rest_api",
  "aws_apigatewayv2_api",
  "aws_sqs_queue",
  "aws_dynamodb_table",
  "aws_vpc",
  "aws_subnet",
  "aws_internet_gateway",
  "aws_nat_gateway",
  "aws_route_table",
  "aws_route_table_association",
  "aws_security_group",
  "aws_security_group_rule",
  "aws_route53_record",
  "aws_route53_zone",
  "aws_wafv2_web_acl",
  "aws_shield_protection",
  "aws_autoscaling_group",
  "aws_autoscaling_policy",
  "aws_cloudwatch_metric_alarm",
  "aws_iam_role",
  "aws_iam_role_policy",
  "aws_iam_role_policy_attachment",
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.change.actions[_] == "create"
  not allowed_types[resource.type]
  msg := sprintf("Resource type '%v' is not in the FlowOps allowed list. Open a policy override request to enable it.", [resource.type])
}
