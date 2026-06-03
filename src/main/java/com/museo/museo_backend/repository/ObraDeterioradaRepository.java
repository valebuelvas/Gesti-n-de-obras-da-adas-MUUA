package com.museo.museo_backend.repository;

import com.museo.museo_backend.entity.ObraDeteriorada;
import com.museo.museo_backend.entity.enums.EstadoObra;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ObraDeterioradaRepository extends JpaRepository<ObraDeteriorada, Integer> {

    Page<ObraDeteriorada> findAll(Pageable pageable);

    List<ObraDeteriorada> findByEstado(EstadoObra estado);

    List<ObraDeteriorada> findByObraId(Integer idObra);

    @Query(value = """
        SELECT od.* FROM obras_deterioradas od
        JOIN obras o ON o.id = od.id_obra
        WHERE (:estado IS NULL OR od.estado = :estado)
        AND (:autor IS NULL OR LOWER(o.autor::text) LIKE LOWER(CONCAT('%', :autor, '%')))
        AND (:idTecnica IS NULL OR o.id_tecnica = :idTecnica)
        AND (:idTipo IS NULL OR o.id_tipo = :idTipo)
        AND (:anio IS NULL OR EXTRACT(YEAR FROM o.fecha_creacion) = :anio)
        """,
        countQuery = """
        SELECT COUNT(*) FROM obras_deterioradas od
        JOIN obras o ON o.id = od.id_obra
        WHERE (:estado IS NULL OR od.estado = :estado)
        AND (:autor IS NULL OR LOWER(o.autor::text) LIKE LOWER(CONCAT('%', :autor, '%')))
        AND (:idTecnica IS NULL OR o.id_tecnica = :idTecnica)
        AND (:idTipo IS NULL OR o.id_tipo = :idTipo)
        AND (:anio IS NULL OR EXTRACT(YEAR FROM o.fecha_creacion) = :anio)
        """,
        nativeQuery = true)
    Page<ObraDeteriorada> filtrarAvanzado(
        @Param("estado") String estado,
        @Param("autor") String autor,
        @Param("idTecnica") Integer idTecnica,
        @Param("idTipo") Integer idTipo,
        @Param("anio") Integer anio,
        Pageable pageable);

    @Query("SELECT od FROM ObraDeteriorada od WHERE od.id NOT IN " +
        "(SELECT r.obraDeteriorada.id FROM Restauracion r WHERE r.estado = 'finalizado')")
    Page<ObraDeteriorada> findSinRestauracionFinalizada(Pageable pageable);
}