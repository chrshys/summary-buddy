#!/bin/bash

# Check if running on macOS
if [ "$(uname)" != "Darwin" ]; then
    echo "This script is only for macOS"
    exit 1
fi

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install sox with mp3 support
echo "Installing sox with mp3 support..."
brew install sox
brew install lame

echo "Audio dependencies installed successfully!"
