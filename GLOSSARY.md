# Quiz generator

A local quiz app for students revising for an exam. The student names a topic, the app retrieves matching chunks from the knowledge base, and a local model writes a multiple-choice quiz grounded in those chunks.

## Language

### Knowledge

**Knowledge base**:
All the source material that quizzes can draw on.
_Avoid_: vector database, data, content, corpus

**Source**:
One document in the knowledge base, such as a PDF or a markdown file.
_Avoid_: material, file

**Chunk**:
A piece of a source that retrieval can return.
_Avoid_: passage, snippet, embedding

**Similarity**:
How closely a chunk matches the topic it was retrieved for. Higher means a closer match.
_Avoid_: score, relevance, distance

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
