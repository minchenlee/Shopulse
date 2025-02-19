variable "vpc_name" {
  type = string
  default = "thesis"
}

variable "alb_name" {
  type = string
  default = "thesis-alb"
}

variable "belong_tag" {
  type = string
  default = "thesis"
}

variable "root_domain_acm_certificate_arn" {
  type = string
  default = "arn:aws:acm:us-east-1:979295895093:certificate/111c20ae-36a0-48de-8ea1-e86bf5e005d3"
}

variable "subdomain_acm_certificate_arn" {
  type = string
  default = "arn:aws:acm:us-east-1:979295895093:certificate/2be284b8-04f5-4691-a384-e5fd2f3e449d"
}