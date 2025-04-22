package io.dataease.extensions.view.dto;


import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
public class DatasetRowPermissionsTreeObj implements Serializable {

    private static final long serialVersionUID = 1L;
    private String logic;
    private List<DatasetRowPermissionsTreeItem> items;
}
