package io.dataease.api.visualization;

import io.dataease.api.visualization.dto.VisualizationOuterParamsDTO;
import io.dataease.api.visualization.response.VisualizationOuterParamsBaseResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

public interface VisualizationOuterParamsApi {


    @GetMapping("/queryWithVisualizationId/{dvId}")
    VisualizationOuterParamsDTO queryWithVisualizationId(@PathVariable("dvId") String dvId);

    @PostMapping("/updateOuterParamsSet")
    void updateOuterParamsSet(@RequestBody VisualizationOuterParamsDTO OuterParamsDTO);

    @GetMapping("/getOuterParamsInfo/{dvId}")
    VisualizationOuterParamsBaseResponse getOuterParamsInfo(@PathVariable("dvId") String dvId);
}
