package flowops.public_access

# Block any configuration that exposes private resources to the public internet.

# ── S3 buckets — must block public ACLs ───────────────────────────────────────
deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_s3_bucket_public_access_block"
  resource.change.actions[_] == "create"
  not resource.change.after.block_public_acls
  msg := sprintf(
    "S3 bucket public access block '%v' must have block_public_acls = true.",
    [resource.address]
  )
}

deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_s3_bucket_public_access_block"
  resource.change.actions[_] == "create"
  not resource.change.after.block_public_policy
  msg := sprintf(
    "S3 bucket public access block '%v' must have block_public_policy = true.",
    [resource.address]
  )
}

# ── Security groups — block 0.0.0.0/0 ingress on sensitive ports ─────────────
sensitive_ports := {22, 3306, 5432, 6379, 27017}

deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_security_group_rule"
  resource.change.after.type == "ingress"
  cidr          := resource.change.after.cidr_blocks[_]
  cidr          == "0.0.0.0/0"
  port          := resource.change.after.from_port
  sensitive_ports[port]
  msg := sprintf(
    "Security group rule '%v' allows 0.0.0.0/0 ingress on port %v. Use a restrictive CIDR block instead.",
    [resource.address, port]
  )
}

# ── RDS — must not be publicly accessible ─────────────────────────────────────
deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_db_instance"
  resource.change.after.publicly_accessible == true
  msg := sprintf(
    "RDS instance '%v' has publicly_accessible = true. Database instances must not be directly accessible from the internet.",
    [resource.address]
  )
}

# ── ElastiCache — must not be in a public subnet (heuristic) ─────────────────
# Full check requires knowing which subnets are public — use a naming convention.
deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_elasticache_cluster"
  # If subnet group name contains "public" it's likely misconfigured
  subnet_group  := object.get(resource.change.after, "subnet_group_name", "")
  contains(lower(subnet_group), "public")
  msg := sprintf(
    "ElastiCache cluster '%v' references a subnet group named '%v'. Cache clusters must be in private subnets.",
    [resource.address, subnet_group]
  )
}
