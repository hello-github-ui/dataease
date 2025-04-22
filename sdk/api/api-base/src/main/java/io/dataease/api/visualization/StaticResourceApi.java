package io.dataease.api.visualization;

import io.dataease.api.visualization.request.StaticResourceRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Tag(name = "静态文件")
public interface StaticResourceApi {
    @PostMapping("upload/{fileId}")
    @Operation(summary = "上传静态文件")
    public void upload(@PathVariable("fileId") String fileId, @RequestPart("file") MultipartFile file);

    @PostMapping("findResourceAsBase64")
    @Operation(summary = "查找静态文件并转为Base64")
    public Map<String,String> findResourceAsBase64(@RequestBody StaticResourceRequest resourceRequest);

    @GetMapping("urlTest")
    public Map<String,String> urlTest();

}
