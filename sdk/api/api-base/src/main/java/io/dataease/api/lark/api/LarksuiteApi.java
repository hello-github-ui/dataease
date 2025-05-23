package io.dataease.api.lark.api;

import com.github.xiaoymin.knife4j.annotations.ApiSupport;
import io.dataease.api.lark.dto.LarkEnableEditor;
import io.dataease.api.lark.dto.LarkSettingCreator;
import io.dataease.api.lark.dto.LarkTokenRequest;
import io.dataease.api.lark.vo.LarkGroupVO;
import io.dataease.api.lark.vo.LarkInfoVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "国际飞书设置")
@ApiSupport(order = 899)
public interface LarksuiteApi {

    @Operation(summary = "查询国际飞书信息")
    @GetMapping("/info")
    LarkInfoVO info();

    @Operation(summary = "查询国际飞书二维码信息")
    @GetMapping("/qrinfo")
    LarkInfoVO qrinfo();

    @Operation(summary = "保存")
    @PostMapping("/create")
    void save(@RequestBody LarkSettingCreator creator);

    @Operation(summary = "国际飞书token", hidden = true)
    @PostMapping("/token")
    String larkToken(@RequestBody LarkTokenRequest request);

    @Operation(summary = "切换开启状态")
    @PostMapping("/switchEnable")
    void switchEnable(@RequestBody LarkEnableEditor editor);

    @Operation(summary = "验证可用性")
    @PostMapping("/validate")
    void validate(@RequestBody LarkSettingCreator creator);

    @Operation(summary = "国际飞书绑定", hidden = true)
    @PostMapping("/bind")
    void bind(@RequestBody LarkTokenRequest request);

    @Operation(summary = "获取群组", hidden = true)
    @GetMapping("/getGroup")
    LarkGroupVO getGroup();
}
