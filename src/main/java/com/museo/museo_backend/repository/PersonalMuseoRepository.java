package com.museo.museo_backend.repository;

import com.museo.museo_backend.entity.PersonalMuseo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PersonalMuseoRepository extends JpaRepository<PersonalMuseo, Integer> {
    Optional<PersonalMuseo> findByEmail(String email);
}