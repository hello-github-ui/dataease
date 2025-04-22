package io.dataease.api.xpack.share;

import io.dataease.api.xpack.share.request.XpackShareExpRequest;
import io.dataease.api.xpack.share.request.XpackShareProxyRequest;
import io.dataease.api.xpack.share.request.XpackSharePwdRequest;
import io.dataease.api.visualization.request.VisualizationWorkbranchQueryRequest;
import io.dataease.api.xpack.share.request.XpackSharePwdValidator;
import io.dataease.api.xpack.share.vo.XpackShareGridVO;
import io.dataease.api.xpack.share.vo.XpackShareProxyVO;
import io.dataease.api.xpack.share.vo.XpackShareVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

public interface XpackShareApi {

    @GetMapping("/status/{resourceId}")
    boolean status(@PathVariable("resourceId") Long resourceId);

    @PostMapping("/switcher/{resourceId}")
    void switcher(@PathVariable("resourceId") Long resourceId);

    @PostMapping("/editExp")
    void editExp(@RequestBody XpackShareExpRequest request);

    @PostMapping("/editPwd")
    void editPwd(@RequestBody XpackSharePwdRequest request);

    @GetMapping("/detail/{resourceId}")
    XpackShareVO detail(@PathVariable("resourceId") Long resourceId);

    @PostMapping("/query")
    List<XpackShareGridVO> query(@RequestBody VisualizationWorkbranchQueryRequest request);

    @PostMapping("/proxyInfo")
    XpackShareProxyVO proxyInfo(@RequestBody XpackShareProxyRequest request);

    @PostMapping("/validate")
    boolean validatePwd(@RequestBody XpackSharePwdValidator validator);

    @GetMapping("/queryRelationByUserId/{uid}")
    Map<String, String> queryRelationByUserId(@PathVariable("uid") Long uid);
}
