-- Function to match questions based on cosine similarity
CREATE OR REPLACE FUNCTION match_questions(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id uuid,
    question_text text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id,
        q.question_text,
        1 - (qe.embedding <=> query_embedding) AS similarity
    FROM question_embeddings qe
    JOIN questions q ON q.id = qe.question_id
    WHERE 1 - (qe.embedding <=> query_embedding) > match_threshold
    ORDER BY qe.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
