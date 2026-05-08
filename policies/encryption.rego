package flowops.encryption

# Enforce encryption at rest for all data stores and object storage.

# ── RDS instances ──────────────────────────────────────────────────────────────
deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_db_instance"
  resource.change.actions[_] == "create"
  not resource.change.after.storage_encrypted
  msg := sprintf(
    "RDS instance '%v' must have storage_encrypted = true. Unencrypted databases are not permitted.",
    [resource.address]
  )
}

# ── Aurora clusters ────────────────────────────────────────────────────────────
deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_rds_cluster"
  resource.change.actions[_] == "create"
  not resource.change.after.storage_encrypted
  msg := sprintf(
    "Aurora cluster '%v' must have storage_encrypted = true.",
    [resource.address]
  )
}

# ── ElastiCache (encryption in transit + at rest) ──────────────────────────────
deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_elasticache_replication_group"
  resource.change.actions[_] == "create"
  not resource.change.after.at_rest_encryption_enabled
  msg := sprintf(
    "ElastiCache replication group '%v' must have at_rest_encryption_enabled = true.",
    [resource.address]
  )
}

# ── S3 buckets — must have server-side encryption configured ──────────────────
deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  resource.change.actions[_] == "create"
  # Check that a corresponding SSE config resource is also being created
  not has_sse_config(input.resource_changes, resource.address)
  msg := sprintf(
    "S3 bucket '%v' must have an aws_s3_bucket_server_side_encryption_configuration resource. Unencrypted buckets are not permitted.",
    [resource.address]
  )
}

has_sse_config(resources, bucket_address) {
  sse := resources[_]
  sse.type == "aws_s3_bucket_server_side_encryption_configuration"
  sse.change.after.bucket == bucket_address
}

# ── SQS queues — must use KMS or SSE-SQS encryption ─────────────────────────
deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_sqs_queue"
  resource.change.actions[_] == "create"
  not resource.change.after.sqs_managed_sse_enabled
  kms := object.get(resource.change.after, "kms_master_key_id", "")
  kms == ""
  msg := sprintf(
    "SQS queue '%v' must have either sqs_managed_sse_enabled = true or a kms_master_key_id.",
    [resource.address]
  )
}
