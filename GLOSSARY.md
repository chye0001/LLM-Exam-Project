# Quiz generator

A local quiz app for students revising for an exam. The student names a topic, the app retrieves matching chunks from the knowledge base, and a local model writes a multiple-choice quiz grounded in those chunks.

## Language

### Knowledge

**Knowledge base**:
All the source material that quizzes can draw on: the markdown files in `knowledge-base/`.
_Avoid_: data, content, corpus

**Source**:
One document in the knowledge base, a markdown file. Its first `# ` heading is its title.
_Avoid_: material, file

**Ingestion**:
Loading the knowledge base into the vector database: splitting every new or changed source into chunks, embedding them and storing them. The app ingests when it starts, and `npm run ingest` does it by hand.
_Avoid_: indexing, import, upload

**Vector database**:
Qdrant, which stores every chunk with its embedding and finds the chunks most similar to a topic. It holds no quiz data, which stays in SQLite.
_Avoid_: vector store, knowledge base, index

**Embedding**:
The list of numbers, a vector, that the embedding model turns a chunk or a topic into. Texts with similar meanings get embeddings that point in similar directions.
_Avoid_: encoding

**Chunk**:
A piece of a source that retrieval can return.
_Avoid_: passage, snippet, embedding

**Similarity**:
How closely a chunk matches the topic it was retrieved for: the cosine similarity of their embeddings. Higher means a closer match, and retrieval keeps only chunks at or above the similarity threshold.
_Avoid_: score, relevance, distance

**Similarity threshold**:
The lowest similarity a chunk needs to be retrieved. The group calibrates it with `npm run retrieval:scores`, and a new embedding model or new material needs a new one. ADR-0003 records the current value.
_Avoid_: cutoff, minimum score

### Quizzes

**Topic**:
What the student wants a quiz about.
_Avoid_: prompt, query, subject

**Quiz draft**:
A quiz as the model first writes it, before validation.
_Avoid_: raw output, generated JSON

**Try**:
One call to the model while generating a quiz. Generation gives the model up to three tries to write a valid quiz draft.
_Avoid_: attempt, retry

**Quiz**:
A quiz draft that passed validation and was saved, ready to be taken.

**Ungrounded quiz**:
A quiz generated with retrieval skipped, so it has no excerpts. Only demo mode can make one, to show what retrieval changes.
_Avoid_: quiz without RAG, plain quiz

**Demo mode**:
A setting, turned on with `DEMO_MODE=true`, that lets the student skip retrieval so the group can show the same topic with and without sources.
_Avoid_: debug mode, test mode

**Question**:
One multiple-choice item in a quiz, with four options and an explanation.

**Option**:
One of the four things a question offers to pick from. Exactly one option per question is correct.
_Avoid_: choice, alternative

**Distractor**:
An option that is wrong but written to look plausible.
_Avoid_: wrong answer, decoy

**Explanation**:
One sentence on why a question's correct option is right.

**Excerpt**:
A copy of a chunk that a quiz was generated from, saved with the quiz along with its source's title. A chunk can change when the knowledge base is re-indexed; an excerpt never does.
_Avoid_: source, citation, snippet

### Taking quizzes

**Student**:
The person who asks for quizzes and takes them. One installation has one student.
_Avoid_: user, player

**Attempt**:
One run through a quiz, saved with its score.
_Avoid_: session, try, playthrough

**Answer**:
The option a student picked for a question during an attempt.
_Avoid_: response, selection, pick

**Score**:
How many of an attempt's answers were correct, out of the quiz's number of questions.

**Best score**:
The highest score among a quiz's attempts. A quiz without attempts has no best score, which is not the same as a best score of zero.
