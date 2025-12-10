#!/bin/bash
apt-get update && apt-get install -y php-pgsql php-curl php-mbstring
mkdir -p public
cp -r frontend/* public/
mkdir -p public/backend
cp -r backend/* public/backend/
echo '<?php header("Content-Type: application/json"); echo json_encode(["status" => "ok"]); ?>' > public/health.php
chmod 777 public/backend/uploads
echo "Build completed!"
