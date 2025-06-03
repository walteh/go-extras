# Cursor Background Agent Environment - Simplified
FROM ubuntu:25.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install essential packages and Go via apt
RUN apt-get update && apt-get install -y \
	curl \
	git \
	golang-go \
	sudo \
	&& rm -rf /var/lib/apt/lists/*

# Install Bun (not available in Ubuntu repos yet)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Create non-root user
RUN useradd -m -s /bin/bash developer \
	&& usermod -aG sudo developer \
	&& echo "developer ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to developer user and install Bun for them
USER developer
WORKDIR /home/developer

# Install Bun for developer user
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/home/developer/.bun/bin:$PATH"

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"]
