#############################################
# VPC
#############################################
module "thesis-vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.4.0"

  name = var.vpc_name
  cidr = "172.16.0.0/16"

  azs                        = ["us-east-1a", "us-east-1b"]
  public_subnets             = ["172.16.0.0/24", "172.16.1.0/24"]
  enable_nat_gateway         = false
  manage_default_network_acl = false

  tags = {
    Belong    = var.belong_tag
    CreatedBy = "Terraform"
  }
}

#############################################
# Elastic Load Balancer
#############################################
# Create a new load balancer
# Create the ALB
resource "aws_lb" "thesis-alb" {
  name               = var.alb_name
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.thesis-alb-sg.id]
  subnets            = module.thesis-vpc.public_subnets

  enable_deletion_protection = false

  tags = {
    Belong    = var.belong_tag
    CreatedBy = "Terraform"
  }
}

# Create the HTTP listener
resource "aws_lb_listener" "thesis-alb-http" {
  load_balancer_arn = aws_lb.thesis-alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {    
    type             = "forward"
    target_group_arn = aws_lb_target_group.thesis-backend-tg.arn
  }
} 

# Create the HTTPS listener
resource "aws_lb_listener" "thesis-alb-https" {
  load_balancer_arn = aws_lb.thesis-alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.root_domain_acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.thesis-backend-tg.arn
  }
}

# Create the target groups
resource "aws_lb_target_group" "thesis-backend-tg" {
  name_prefix      = "be-tg"
  port             = 80
  protocol         = "HTTP"
  vpc_id           = module.thesis-vpc.vpc_id
  target_type      = "instance"

  stickiness {
    type = "lb_cookie"
    enabled = true
    cookie_duration = 86400
  }

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 5
    interval            = 30
    port                = 3000
    protocol            = "HTTP"
  }
}

# Attach the instances to the target groups
resource "aws_lb_target_group_attachment" "thesis-backend-a" {
  target_group_arn = aws_lb_target_group.thesis-backend-tg.arn
  target_id        = aws_instance.thesis-backend-a.id
  port             = 3000
}

resource "aws_lb_target_group_attachment" "thesis-backend-b" {
  target_group_arn = aws_lb_target_group.thesis-backend-tg.arn
  target_id        = aws_instance.thesis-backend-b.id
  port             = 3000
}




