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
	unzip \
	&& rm -rf /var/lib/apt/lists/*

# Install Bun (not available in Ubuntu repos yet)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Create non-root user
RUN useradd -m -s /bin/bash bgagent \
	&& usermod -aG sudo bgagent \
	&& echo "bgagent ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to developer user and install Bun for them
USER bgagent
WORKDIR /home/bgagent

# Install Bun for developer user
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/home/bgagent/.bun/bin:$PATH"

COPY ./install.sh /bin/bgagent-install.sh
COPY ./start.sh /bin/bgagent-start.sh

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"]
