package flowops.instance_families

# Block GPU and accelerated-compute instance families by default.
# These require budget approval before use (p3, p4, g4, g5, trn1, inf1/inf2).
# Override by removing from this set or by toggling the policy off in FlowOps.
blocked_instance_prefixes := {
  "p2.",   # GPU — older generation
  "p3.",   # GPU — V100
  "p4d.",  # GPU — A100
  "p4de.", # GPU — A100
  "g4dn.", # GPU — T4
  "g4ad.", # GPU — AMD Radeon
  "g5.",   # GPU — A10G
  "g5g.",  # GPU — T4 Graviton
  "trn1.", # Trainium — ML training
  "inf1.", # Inferentia — ML inference
  "inf2.", # Inferentia 2
}

is_blocked_instance(instance_type) {
  prefix := blocked_instance_prefixes[_]
  startswith(instance_type, prefix)
}

# ECS task definitions: check cpu/memory hints (not instance-level for Fargate)
# EC2 launch type: check instance_type on launch template
deny[msg] {
  resource      := input.resource_changes[_]
  resource.type == "aws_launch_template"
  instance_type := resource.change.after.instance_type
  is_blocked_instance(instance_type)
  msg := sprintf(
    "Instance type '%v' is in a restricted family. GPU/accelerated instances require budget approval.",
    [instance_type]
  )
}

# RDS: block GPU-heavy or specialised instance classes
deny[msg] {
  resource       := input.resource_changes[_]
  resource.type  == "aws_db_instance"
  instance_class := resource.change.after.instance_class
  startswith(instance_class, "db.x1")  # high-memory, very expensive
  msg := sprintf(
    "RDS instance class '%v' is restricted. High-memory x1 instances require budget approval.",
    [instance_class]
  )
}
