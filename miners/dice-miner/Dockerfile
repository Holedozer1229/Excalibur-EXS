# File: cmd/diceminer/Dockerfile
# Docker container for Dice-Roll Python miner

FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy miner code
COPY dice_roll_miner.py .

# Default: Run miner with Arthurian axiom
CMD ["python", "dice_roll_miner.py", "mine", \
     "--axiom", "sword legend pull magic kingdom artist stone destroy forget fire steel honey question", \
     "--difficulty", "4"]
