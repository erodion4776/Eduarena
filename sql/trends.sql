-- Trend Analysis Query
SELECT 
    topic, 
    year, 
    COUNT(*) as frequency
FROM public.questions
WHERE year >= EXTRACT(YEAR FROM CURRENT_DATE) - 5
GROUP BY topic, year
ORDER BY year DESC, frequency DESC;
