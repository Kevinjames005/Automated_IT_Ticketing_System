🤖 Automated IT Ticketing System 

An AI-assisted IT ticketing solution designed to support the handling of IT support requests through intelligent text analysis and machine learning. This module focuses on understanding ticket subject lines and descriptions to predict issue priority, identify user-solvable requests, and assist in detecting duplicate tickets. The goal of the system is to reduce manual workload, improve response efficiency, and support faster resolution while preserving human control over critical decisions.

The machine learning model is built using Python and scikit-learn, applying natural language processing techniques to historical ticket data. Rather than fully automating the ticket lifecycle, the system follows a human-in-the-loop approach where AI-generated insights support IT staff in decision-making. This design improves reliability, transparency, and real-world usability, making the solution suitable for enterprise IT support environments as well as academic demonstration purposes.

This repository contains only the ML logic and is intended to be integrated into a larger backend system that manages email ingestion, ticket workflows, dashboards, and knowledge base updates.

✨ Features

📝 Ticket Text Analysis

NLP-based analysis of ticket subject and description

Extraction of meaningful patterns from support requests

⚡ Priority Prediction

Automatic classification of ticket urgency

Assists in SLA-aware ticket handling

📚 User-Solvable Issue Detection

Helps determine whether an issue can be resolved using a knowledge base

Reduces unnecessary ticket creation

🔁 Duplicate Ticket Detection

Semantic similarity-based matching of incoming requests

Prevents redundant support efforts

🧑‍💻 Human-in-the-Loop Design

AI provides insights, humans make final decisions

No automatic ticket assignment or routing

🛠 Technology Stack

Language: Python

Machine Learning: scikit-learn

NLP: Text vectorization and similarity models
