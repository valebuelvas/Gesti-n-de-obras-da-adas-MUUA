package com.museo.museo_backend.repository;

import com.museo.museo_backend.entity.Obra;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ObraRepository extends JpaRepository<Obra, Integer> {

    List<Obra> findByAutorContainingIgnoreCase(String autor);
    List<Obra> findByTituloContainingIgnoreCase(String titulo);
    List<Obra> findByTecnicaId(Integer idTecnica);
    List<Obra> findByTipoId(Integer idTipo);

    @Query("SELECT o FROM Obra o WHERE EXTRACT(YEAR FROM o.fechaCreacion) = :anio")
    List<Obra> findByAnioCreacion(@Param("anio") int anio);

    @Query(value = """
        SELECT * FROM obras o
        WHERE (:autor IS NULL OR LOWER(o.autor::text) LIKE LOWER(CONCAT('%', :autor, '%')))
        AND (:titulo IS NULL OR LOWER(o.titulo::text) LIKE LOWER(CONCAT('%', :titulo, '%')))
        AND (:idTecnica IS NULL OR o.id_tecnica = :idTecnica)
        AND (:idTipo IS NULL OR o.id_tipo = :idTipo)
        AND (:anio IS NULL OR EXTRACT(YEAR FROM o.fecha_creacion) = :anio)
        """,
        countQuery = """
        SELECT COUNT(*) FROM obras o
        WHERE (:autor IS NULL OR LOWER(o.autor::text) LIKE LOWER(CONCAT('%', :autor, '%')))
        AND (:titulo IS NULL OR LOWER(o.titulo::text) LIKE LOWER(CONCAT('%', :titulo, '%')))
        AND (:idTecnica IS NULL OR o.id_tecnica = :idTecnica)
        AND (:idTipo IS NULL OR o.id_tipo = :idTipo)
        AND (:anio IS NULL OR EXTRACT(YEAR FROM o.fecha_creacion) = :anio)
        """,
        nativeQuery = true)
    Page<Obra> busquedaAvanzada(
        @Param("autor") String autor,
        @Param("titulo") String titulo,
        @Param("idTecnica") Integer idTecnica,
        @Param("idTipo") Integer idTipo,
        @Param("anio") Integer anio,
        Pageable pageable);

    Page<Obra> findAll(Pageable pageable);
    Page<Obra> findByTituloContainingIgnoreCase(String titulo, Pageable pageable);
    Page<Obra> findByAutorContainingIgnoreCase(String autor, Pageable pageable);
    Page<Obra> findByTituloContainingIgnoreCaseOrAutorContainingIgnoreCase(String titulo, String autor, Pageable pageable);
}