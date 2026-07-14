FROM node:22-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY ml/requirements.txt ./ml/requirements.txt
RUN pip3 install --no-cache-dir -r ml/requirements.txt \
  && pip3 install --no-cache-dir numpy xgboost

COPY server ./server
COPY ml ./ml

ENV PORT=3001
ENV PYTHON_PATH=python3

EXPOSE 3001

CMD ["npm", "--prefix", "server", "start"]
