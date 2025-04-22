package io.dataease.extensions.view.dto;

import lombok.Data;

import java.util.List;

@Data
public class ColumnPermissionItem {
    static public String CompleteDesensitization = "******";
    static public String KeepFirstAndLastThreeCharacters = "XXX***XXX";
    static public String KeepMiddleThreeCharacters = "***XXX***";
    private Long id;
    private String name;
    private Integer deType;
    private Boolean selected = false;
    private String opt;
    private DesensitizationRule desensitizationRule;
    public enum BuiltInRule {
        CompleteDesensitization,
        KeepFirstAndLastThreeCharacters,
        KeepMiddleThreeCharacters,
        custom
    }
    public enum CustomBuiltInRule {
        RetainBeforeMAndAfterN,
        RetainMToN
    }

    @Data
    public class DesensitizationRule {
        private BuiltInRule builtInRule;
        private CustomBuiltInRule customBuiltInRule;

        private Integer m;
        private Integer n;
        private String specialCharacter;
        private List<String> specialCharacterList;
    }
}
