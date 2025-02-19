################################################
# Key pair generation
################################################
# Key for admin to access ec2
resource "tls_private_key" "admin-ec2-ssh-key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Create AWS key pair 
resource "aws_key_pair" "admin-ec2-ssh-key" {
  key_name   = "thesis-backend-instance-key"
  public_key = tls_private_key.admin-ec2-ssh-key.public_key_openssh
  tags = {
    Belong    = var.belong_tag
    CreatedBy = "Terraform"
  }
}

# Save admin-ec2-ssh-key to local file
resource "local_file" "private_key" {
  content         = tls_private_key.admin-ec2-ssh-key.private_key_pem
  filename        = "${path.module}/thesis-backend-instance-key.pem"
  file_permission = 0400
}


################################################
# Security group
################################################

# Security group for thesis backend instance
resource "aws_security_group" "thesis-backend-instance" {
  name        = "thesis-backend-instance"
  description = "Security group for thesis backend instance"
  vpc_id      = module.thesis-vpc.vpc_id

  ingress {
    description = "Allow SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow All TCP traffic from port 3000"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [module.thesis-vpc.vpc_cidr_block]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Belong    = var.belong_tag
    CreatedBy = "Terraform"
  }
}

# Create the ALB security group
resource "aws_security_group" "thesis-alb-sg" {
  name   = "${var.alb_name}-security-group"
  vpc_id = module.thesis-vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

