package io.dataease.chart.charts.impl.map;

import io.dataease.chart.charts.impl.ExtQuotaChartHandler;
import lombok.Getter;
import org.springframework.stereotype.Component;

@Component
public class MapHandler extends ExtQuotaChartHandler {
    @Getter
    private String type = "map";
}
