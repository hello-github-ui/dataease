package io.dataease.constant;

public enum AuthEnum {
    READ(1), EXPORT(4), MANAGE(7), AUTH(9);
    private Integer weight;

    AuthEnum(Integer weight) {
        this.weight = weight;
    }

    AuthEnum() {
    }

    public Integer getWeight() {
        return weight;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }
}
