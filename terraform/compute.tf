# ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  owners = ["099720109477"]
}


# thesis backend instance a
resource "aws_instance" "thesis-backend-a" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t2.micro"
  key_name                    = aws_key_pair.admin-ec2-ssh-key.key_name
  vpc_security_group_ids      = [aws_security_group.thesis-backend-instance.id]
  subnet_id                   = module.thesis-vpc.public_subnets[0]
  associate_public_ip_address = true

  user_data = <<-EOF
              #!/bin/bash
              sudo apt update
              sudo apt install -y nginx
              sudo snap install docker
              EOF

  tags = {
    Belong    = var.belong_tag
    CreatedBy = "Terraform"
  }
}


# thesis backend instance b
resource "aws_instance" "thesis-backend-b" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t2.micro"
  key_name                    = aws_key_pair.admin-ec2-ssh-key.key_name
  vpc_security_group_ids      = [aws_security_group.thesis-backend-instance.id]
  subnet_id                   = module.thesis-vpc.public_subnets[1]
  associate_public_ip_address = true

  user_data = <<-EOF
              #!/bin/bash
              sudo apt update
              sudo apt install -y nginx
              sudo snap install docker
              EOF

  tags = {
    Belong    = var.belong_tag
    CreatedBy = "Terraform"
  }
}

