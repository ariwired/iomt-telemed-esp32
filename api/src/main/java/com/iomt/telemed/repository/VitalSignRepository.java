package com.iomt.telemed.repository;

import com.iomt.telemed.entity.VitalSign;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface VitalSignRepository extends JpaRepository<VitalSign, Long> {

    List<VitalSign> findByPacienteIdOrderByTimestampDesc(String pacienteId, Pageable pageable);

    List<VitalSign> findByTimestampAfterOrderByTimestampAsc(Instant timestamp);
}