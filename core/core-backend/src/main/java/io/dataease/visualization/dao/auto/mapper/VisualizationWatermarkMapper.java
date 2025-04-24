package io.dataease.visualization.dao.auto.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.dataease.visualization.dao.auto.entity.VisualizationWatermark;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Update;

/**
 * <p>
 * 仪表板水印设置表 Mapper 接口
 * </p>
 *
 * @author fit2cloud
 * @since 2024-01-09
 */
@Mapper
public interface VisualizationWatermarkMapper extends BaseMapper<VisualizationWatermark> {

    @Update("""
        UPDATE `visualization_watermark` set `setting_content` = REPLACE(`setting_content`,'"enable":true','"enable":false')
        """)
    void disable();
}
