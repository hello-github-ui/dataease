package io.dataease.defeign.permissions.auth;

import io.dataease.api.permissions.auth.api.AuthApi;
import io.dataease.feign.DeFeign;


@DeFeign(value = "xpack-permissions", path = "/auth")
public interface PermissionFeignService extends AuthApi {

}
