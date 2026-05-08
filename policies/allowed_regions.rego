package flowops.allowed_regions

# Geography restrictions — only deploy in approved AWS regions.
# Modify this list to match your organisation's compliance requirements.
allowed_regions := {
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-north-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
}

# Deny any provider block that references an unapproved region.
deny[msg] {
  provider := input.configuration.provider_config[_]
  provider.name == "aws"
  region := provider.expressions.region.constant_value
  not allowed_regions[region]
  msg := sprintf(
    "AWS region '%v' is not in the approved region list. Allowed: %v",
    [region, concat(", ", allowed_regions)]
  )
}

# Also check resource-level region attributes where present.
deny[msg] {
  resource := input.resource_changes[_]
  region   := resource.change.after.region
  not allowed_regions[region]
  msg := sprintf(
    "Resource '%v' specifies region '%v' which is not allowed.",
    [resource.address, region]
  )
}
