package com.museo.museo_backend.service;

import com.museo.museo_backend.dto.LoginRequest;
import com.museo.museo_backend.dto.LoginResponse;
import com.museo.museo_backend.entity.PersonalMuseo;
import com.museo.museo_backend.repository.PersonalMuseoRepository;
import com.museo.museo_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final PersonalMuseoRepository repo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        PersonalMuseo personal = repo.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Credenciales inválidas"));

        // Verificar que no sea no_perteneciente
        if (personal.getRol().name().equals("no_perteneciente")) {
            throw new RuntimeException("Tu cuenta ha sido desactivada. Contacta al administrador.");
        }

        if (!passwordEncoder.matches(request.getPassword(), personal.getPassword())) {
            throw new RuntimeException("Credenciales inválidas");
        }

        String token = jwtUtil.generarToken(personal.getEmail(), personal.getRol().name());

        return LoginResponse.builder()
                .token(token)
                .nombre(personal.getNombre())
                .apellido(personal.getApellido())
                .rol(personal.getRol().name())
                .build();
    }
}
