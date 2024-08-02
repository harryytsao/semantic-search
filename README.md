# Semantic Search

## Getting Started

### Setting up environment

If it's the first time running the project:

```bash
git clone https://github.com/harryytsao/semantic-search.git
cd semantic-search
mv .env.demo .env
npm install
npm run build
bash standalone_embed.sh start
npm run start
```

To build the vector DB, there is a hidden button to the left of "Download JSON Results"

## Milvus Commands

```bash
bash standalone_embed.sh start
bash standalone_embed.sh stop
bash standalone_embed.sh delete
```
