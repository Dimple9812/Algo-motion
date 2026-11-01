package dev.algomotion.catalog.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProblemRepository extends JpaRepository<Problem, java.util.UUID> {
    Optional<Problem> findBySlug(String slug);

    List<Problem> findBySlugIn(Collection<String> slugs);

    String WHERE = """
        where (:topic is null or p.topic = :topic)
          and (:difficulty is null or p.difficulty = :difficulty)
          and (:q is null or lower(p.title) like :q
               or exists (select 1 from Problem p2 join p2.tags t where p2 = p and lower(t) like :q))
        """;

    @Query(value = "select p from Problem p " + WHERE
        + " order by p.topic, case p.difficulty when dev.algomotion.catalog.domain.Difficulty.EASY then 0 when dev.algomotion.catalog.domain.Difficulty.MEDIUM then 1 else 2 end, p.title",
        countQuery = "select count(p) from Problem p " + WHERE)
    Page<Problem> search(@Param("q") String q, @Param("topic") String topic, @Param("difficulty") Difficulty difficulty, Pageable pageable);

    @Query("select p.topic, count(p) from Problem p group by p.topic order by p.topic")
    List<Object[]> topicCounts();
}
