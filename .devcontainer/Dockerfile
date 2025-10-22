FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install Node.js 22.x
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    nodejs \
    build-essential \
    pkg-config \
    libssl-dev \
    curl \
    git \
    ca-certificates \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Switch to vscode user for tool installations
USER vscode

# Install Rust for vscode user
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/home/vscode/.cargo/bin:${PATH}"

# Install Bun for vscode user
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/home/vscode/.bun/bin:${PATH}"

# Verify installations
RUN cargo --version && rustc --version && bun --version

# Set working directory
WORKDIR /workspaces/exam-creator