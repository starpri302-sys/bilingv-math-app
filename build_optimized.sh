#!/bin/bash
# Script to build the application with a memory limit
export NODE_OPTIONS="--max-old-space-size=512"
echo "Starting build with max-old-space-size=512..."
npm run build
