package io.dataease.datasource.type;


import lombok.Data;

@Data
public class Es {
    private String url;
    private String username;
    private String password;
    private String version;
    private String uri;

}
