package io.dataease.api.visualization;

import com.github.xiaoymin.knife4j.annotations.ApiSupport;
import io.dataease.api.visualization.request.VisualizationWatermarkRequest;
import io.dataease.api.visualization.vo.VisualizationWatermarkVO;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;

@Tag(name = "可视化管理:水印")
@ApiSupport(order = 994)
public interface VisualizationWatermarkApi {


    @ResponseBody
    @GetMapping("/find")
    VisualizationWatermarkVO getWatermarkInfo();

    @ResponseBody
    @PostMapping("/save")
    void saveWatermarkInfo(@RequestBody VisualizationWatermarkRequest watermarkRequest);

}
