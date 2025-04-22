package io.dataease.websocket.entity;

import java.security.Principal;

public class DePrincipal implements Principal {

    private String name;

    public DePrincipal(String name) {
        this.name = name;
    }

    @Override
    public String getName() {
        return name;
    }
}
