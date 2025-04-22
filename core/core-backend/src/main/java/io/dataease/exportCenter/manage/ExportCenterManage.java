package io.dataease.exportCenter.manage;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import io.dataease.api.chart.dto.ViewDetailField;
import io.dataease.api.chart.request.ChartExcelRequest;
import io.dataease.api.chart.request.ChartExcelRequestInner;
import io.dataease.api.exportCenter.vo.ExportTaskDTO;
import io.dataease.auth.bo.TokenUserBO;
import io.dataease.chart.dao.auto.mapper.CoreChartViewMapper;
import io.dataease.chart.server.ChartDataServer;
import io.dataease.exception.DEException;
import io.dataease.exportCenter.dao.auto.entity.CoreExportTask;
import io.dataease.exportCenter.dao.auto.mapper.CoreExportTaskMapper;
import io.dataease.license.config.XpackInteract;
import io.dataease.system.manage.SysParameterManage;
import io.dataease.utils.*;
import io.dataease.visualization.server.DataVisualizationServer;
import io.dataease.websocket.WsMessage;
import io.dataease.websocket.WsService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.net.InetAddress;
import java.util.*;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * 导出中心管理类，负责导出任务的创建、执行、状态管理、文件下载及清理等功能。
 */
@Component
@Transactional(rollbackFor = Exception.class)
public class ExportCenterManage {

    private final static String DATA_URL_TITLE = "data:image/jpeg;base64,";
    private static final String exportData_path = "/opt/dataease2.0/data/exportData/";
    private static final String LOG_RETENTION = "30";
    // 支持的导出任务状态
    static private List<String> STATUS = Arrays.asList("SUCCESS", "FAILED", "PENDING", "IN_PROGRESS", "ALL");

    @Resource
    DataVisualizationServer dataVisualizationServer;
    @Resource
    private CoreExportTaskMapper exportTaskMapper;
    @Resource
    private CoreChartViewMapper coreChartViewMapper;
    @Autowired
    private WsService wsService;
    @Resource
    private SysParameterManage sysParameterManage;
    @Value("${export.core.size:10}")
    private int core;
    @Value("${export.max.size:10}")
    private int max;
    @Value("${export.dataset.limit:100000}")
    private int limit;
    @Value("${extract.page.size:50000}")
    private Integer extractPageSize;
    private ScheduledThreadPoolExecutor scheduledThreadPoolExecutor;
    private int keepAliveSeconds = 600;
    // 当前正在运行的导出任务，key为任务ID，value为Future对象
    private Map<String, Future> Running_Task = new HashMap<>();
    @Resource
    private ChartDataServer chartDataServer;

    /**
     * 初始化线程池，设置核心线程数、最大线程数及线程存活时间
     */
    @PostConstruct
    public void init() {
        scheduledThreadPoolExecutor = new ScheduledThreadPoolExecutor(core);
        scheduledThreadPoolExecutor.setKeepAliveTime(keepAliveSeconds, TimeUnit.SECONDS);
        scheduledThreadPoolExecutor.setMaximumPoolSize(max);
    }

    /**
     * 定时检查正在运行的导出任务，若任务完成则从运行列表移除并通过WebSocket推送任务状态更新
     */
    @Scheduled(fixedRate = 5000)
    public void checkRunningTask() {
        Iterator<Map.Entry<String, Future>> iterator = Running_Task.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, Future> entry = iterator.next();
            if (entry.getValue().isDone()) {
                iterator.remove();
                try {
                    CoreExportTask exportTask = exportTaskMapper.selectById(entry.getKey());
                    ExportTaskDTO exportTaskDTO = new ExportTaskDTO();
                    BeanUtils.copyBean(exportTaskDTO, exportTask);
                    setExportFromName(exportTaskDTO);
                    WsMessage message = new WsMessage(exportTask.getUserId(), "/task-export-topic", exportTaskDTO);
                    wsService.releaseMessage(message);
                } catch (Exception e) {
                    // 异常忽略，避免影响调度
                }
            }
        }
    }

    /**
     * 根据导出任务ID，向客户端响应Excel文件，实现文件下载
     *
     * @param id       导出任务ID
     * @param response HttpServletResponse，用于写出文件流
     * @throws Exception 读取文件或写出流异常
     */
    public void download(String id, HttpServletResponse response) throws Exception {
        CoreExportTask exportTask = exportTaskMapper.selectById(id);
        OutputStream outputStream = response.getOutputStream();
        // 设置响应内容类型为Excel
        response.setContentType("application/vnd.ms-excel");
        // 设置响应头，附件形式下载，文件名为导出任务文件名
        response.setHeader("Content-disposition", "attachment;filename=" + exportTask.getFileName());
        InputStream fileInputStream = new FileInputStream(exportData_path + id + "/" + exportTask.getFileName());
        byte[] buffer = new byte[4096];
        int bytesRead;
        while ((bytesRead = fileInputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, bytesRead);
        }
        outputStream.flush();
        outputStream.close();
        fileInputStream.close();
        response.flushBuffer();
    }

    /**
     * 删除指定ID的导出任务及其对应的文件和运行任务（若存在）
     *
     * @param id 导出任务ID
     */
    public void delete(String id) {
        // 取消正在运行的任务
        Iterator<Map.Entry<String, Future>> iterator = Running_Task.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, Future> entry = iterator.next();
            if (entry.getKey().equalsIgnoreCase(id)) {
                entry.getValue().cancel(true);
                iterator.remove();
            }
        }
        // 删除导出文件目录
        FileUtils.deleteDirectoryRecursively(exportData_path + id);
        // 删除数据库记录
        exportTaskMapper.deleteById(id);
    }

    /**
     * 根据状态删除当前用户所有符合条件的导出任务及文件
     *
     * @param type 状态类型，支持SUCCESS, FAILED, PENDING, IN_PROGRESS, ALL
     */
    public void deleteAll(String type) {
        if (!STATUS.contains(type)) {
            DEException.throwException("无效的状态");
        }
        QueryWrapper<CoreExportTask> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", AuthUtils.getUser().getUserId());
        if (!type.equalsIgnoreCase("ALL")) {
            queryWrapper.eq("export_status", type);
        }
        List<CoreExportTask> exportTasks = exportTaskMapper.selectList(queryWrapper);
        exportTasks.parallelStream().forEach(exportTask -> {
            // 取消运行任务
            Iterator<Map.Entry<String, Future>> iterator = Running_Task.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<String, Future> entry = iterator.next();
                if (entry.getKey().equalsIgnoreCase(exportTask.getId())) {
                    entry.getValue().cancel(true);
                    iterator.remove();
                }
            }
            // 删除文件和数据库记录
            FileUtils.deleteDirectoryRecursively(exportData_path + exportTask.getId());
            exportTaskMapper.deleteById(exportTask.getId());
        });

    }

    /**
     * 批量删除指定ID列表的导出任务
     *
     * @param ids 导出任务ID列表
     */
    public void delete(List<String> ids) {
        ids.forEach(this::delete);
    }

    /**
     * 重试失败的导出任务，重新提交导出
     *
     * @param id 导出任务ID
     */
    public void retry(String id) {
        CoreExportTask exportTask = exportTaskMapper.selectById(id);
        if (!exportTask.getExportStatus().equalsIgnoreCase("FAILED")) {
            DEException.throwException("正在导出中!");
        }
        exportTask.setExportStatus("PENDING");
        exportTask.setExportProgress("0");
        exportTask.setExportMachineName(hostName());
        exportTask.setExportTime(System.currentTimeMillis());
        exportTaskMapper.updateById(exportTask);
        FileUtils.deleteDirectoryRecursively(exportData_path + id);
        if (exportTask.getExportFromType().equalsIgnoreCase("chart")) {
            ChartExcelRequest request = JsonUtil.parseObject(exportTask.getParams(), ChartExcelRequest.class);
            startViewTask(exportTask, request);
        }
    }

    /**
     * 查询当前用户的导出任务列表，支持按状态过滤
     *
     * @param status 任务状态，支持SUCCESS, FAILED, PENDING, IN_PROGRESS, ALL
     * @return 导出任务DTO列表
     */
    public List<ExportTaskDTO> exportTasks(String status) {
        if (!STATUS.contains(status)) {
            DEException.throwException("Invalid status: " + status);
        }
        QueryWrapper<CoreExportTask> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", AuthUtils.getUser().getUserId());
        queryWrapper.orderByDesc("export_time");
        List<CoreExportTask> exportTasks = exportTaskMapper.selectList(queryWrapper);
        List<ExportTaskDTO> result = new ArrayList<>();
        exportTasks.forEach(exportTask -> {
            ExportTaskDTO exportTaskDTO = new ExportTaskDTO();
            BeanUtils.copyBean(exportTaskDTO, exportTask);
            if (status.equalsIgnoreCase("ALL") || status.equalsIgnoreCase(exportTaskDTO.getExportStatus())) {
                setExportFromAbsName(exportTaskDTO);
            }
            if (status.equalsIgnoreCase("ALL") || status.equalsIgnoreCase(exportTaskDTO.getExportStatus())) {
                proxy().setOrg(exportTaskDTO);
            }
            result.add(exportTaskDTO);
        });

        return result;
    }

    /**
     * 通过AOP切面注解，设置导出任务的组织信息（空实现，供扩展）
     *
     * @param exportTaskDTO 导出任务DTO
     */
    @XpackInteract(value = "exportCenter", before = false)
    public void setOrg(ExportTaskDTO exportTaskDTO) {
        // 空实现，供AOP扩展
    }

    /**
     * 获取当前类的代理对象，用于调用带AOP注解的方法
     *
     * @return ExportCenterManage代理对象
     */
    private ExportCenterManage proxy() {
        return CommonBeanFactory.getBean(ExportCenterManage.class);
    }

    /**
     * 设置导出任务的导出来源绝对路径名称（如图表路径）
     *
     * @param exportTaskDTO 导出任务DTO
     */
    private void setExportFromAbsName(ExportTaskDTO exportTaskDTO) {
        if (exportTaskDTO.getExportFromType().equalsIgnoreCase("chart")) {
            exportTaskDTO.setExportFromName(dataVisualizationServer.getAbsPath(exportTaskDTO.getExportFrom()));
        }
    }

    /**
     * 设置导出任务的导出来源名称（如图表标题）
     *
     * @param exportTaskDTO 导出任务DTO
     */
    private void setExportFromName(ExportTaskDTO exportTaskDTO) {
        if (exportTaskDTO.getExportFromType().equalsIgnoreCase("chart")) {
            exportTaskDTO.setExportFromName(coreChartViewMapper.selectById(exportTaskDTO.getExportFrom()).getTitle());
        }
    }

    /**
     * 获取当前主机名，用于记录导出任务执行机器
     *
     * @return 主机名字符串
     */
    private String hostName() {
        String hostname = null;
        try {
            InetAddress localMachine = InetAddress.getLocalHost();
            hostname = localMachine.getHostName();
        } catch (Exception e) {
            DEException.throwException("请设置主机名！");
        }
        return hostname;
    }

    /**
     * 新增导出任务，保存任务信息并启动导出异步任务
     *
     * @param exportFrom     导出来源ID（如图表ID）
     * @param exportFromType 导出来源类型（如chart）
     * @param request        导出请求参数
     */
    public void addTask(String exportFrom, String exportFromType, ChartExcelRequest request) {
        CoreExportTask exportTask = new CoreExportTask();
        exportTask.setId(UUID.randomUUID().toString());
        exportTask.setUserId(AuthUtils.getUser().getUserId());
        exportTask.setExportFrom(exportFrom);
        exportTask.setExportFromType(exportFromType);
        exportTask.setExportStatus("PENDING");
        exportTask.setFileName(request.getViewName() + ".xlsx");
        exportTask.setExportProgress("0");
        exportTask.setExportTime(System.currentTimeMillis());
        exportTask.setParams(JsonUtil.toJSONString(request).toString());
        exportTask.setExportMachineName(hostName());
        exportTaskMapper.insert(exportTask);
        startViewTask(exportTask, request);
    }

    /**
     * 启动异步导出任务，生成Excel文件并更新任务状态
     *
     * @param exportTask 导出任务实体
     * @param request    导出请求参数
     */
    private void startViewTask(CoreExportTask exportTask, ChartExcelRequest request) {
        String dataPath = exportData_path + exportTask.getId();
        File directory = new File(dataPath);
        boolean isCreated = directory.mkdir();
        TokenUserBO tokenUserBO = AuthUtils.getUser();
        Future future = scheduledThreadPoolExecutor.submit(() -> {
            AuthUtils.setUser(tokenUserBO);
            try {
                exportTask.setExportStatus("IN_PROGRESS");
                exportTaskMapper.updateById(exportTask);
                chartDataServer.findExcelData(request);

                Workbook wb = new SXSSFWorkbook();

                // 创建单元格样式，设置字体大小、加粗及背景色
                CellStyle cellStyle = wb.createCellStyle();
                Font font = wb.createFont();
                font.setFontHeightInPoints((short) 12);
                font.setBold(true);
                cellStyle.setFont(font);
                // 设置单元格背景颜色
                cellStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
                // 设置单元格填充样式(使用纯色背景颜色填充)
                cellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

                if (CollectionUtils.isEmpty(request.getMultiInfo())) {
                    // 单个sheet写入数据
                    List<Object[]> details = request.getDetails();
                    Integer[] excelTypes = request.getExcelTypes();
                    details.add(0, request.getHeader());
                    ViewDetailField[] detailFields = request.getDetailFields();
                    Object[] header = request.getHeader();

                    //明细sheet
                    Sheet detailsSheet = wb.createSheet("数据");

                    ChartDataServer.setExcelData(detailsSheet, cellStyle, header, details, detailFields, excelTypes);
                } else {
                    // 多sheet写入数据
                    for (int i = 0; i < request.getMultiInfo().size(); i++) {
                        ChartExcelRequestInner requestInner = request.getMultiInfo().get(i);

                        List<Object[]> details = requestInner.getDetails();
                        Integer[] excelTypes = requestInner.getExcelTypes();
                        details.add(0, requestInner.getHeader());
                        ViewDetailField[] detailFields = requestInner.getDetailFields();
                        Object[] header = requestInner.getHeader();

                        //明细sheet
                        Sheet detailsSheet = wb.createSheet("数据 " + (i + 1));

                        ChartDataServer.setExcelData(detailsSheet, cellStyle, header, details, detailFields, excelTypes);
                    }
                }
                // 写入文件
                try (FileOutputStream outputStream = new FileOutputStream(dataPath + "/" + request.getViewName() + ".xlsx")) {
                    wb.write(outputStream);
                    outputStream.flush();
                }
                wb.close();
                exportTask.setExportProgress("100");
                exportTask.setExportStatus("SUCCESS");
                setFileSize(dataPath + "/" + request.getViewName() + ".xlsx", exportTask);
            } catch (Exception e) {
                exportTask.setMsg(e.getMessage());
                LogUtil.error("Failed to export data", e);
                exportTask.setExportStatus("FAILED");
            } finally {
                exportTaskMapper.updateById(exportTask);
            }
        });
        Running_Task.put(exportTask.getId(), future);
    }

    /**
     * 设置导出文件大小及单位，方便前端展示
     *
     * @param filePath   文件路径
     * @param exportTask 导出任务实体
     */
    private void setFileSize(String filePath, CoreExportTask exportTask) {
        File file = new File(filePath);
        long length = file.length();
        String unit = "Mb";
        double size = 0.0;
        if ((double) length / 1024 / 1024 > 1) {
            if ((double) length / 1024 / 1024 / 1024 > 1) {
                unit = "Gb";
                size = Double.parseDouble(String.format("%.2f", (double) length / 1024 / 1024 / 1024));
            } else {
                size = Double.parseDouble(String.format("%.2f", (double) length / 1024 / 1024));
            }

        } else {
            unit = "Kb";
            size = Double.parseDouble(String.format("%.2f", (double) length / 1024));
        }
        exportTask.setFileSize(size);
        exportTask.setFileSizeUnit(unit);
    }

    /**
     * 清理过期的导出任务及文件，依据系统参数配置的文件保留时间
     */
    public void cleanLog() {
        String key = "basic.exportFileLiveTime";
        String val = sysParameterManage.singleVal(key);
        if (StringUtils.isBlank(val)) {
            DEException.throwException("未获取到文件保留时间");
        }
        QueryWrapper<CoreExportTask> queryWrapper = new QueryWrapper<>();
        long expTime = Long.parseLong(val) * 24L * 3600L * 1000L;
        long threshold = System.currentTimeMillis() - expTime;
        queryWrapper.lt("export_time", threshold);
        exportTaskMapper.selectList(queryWrapper).forEach(coreExportTask -> {
            delete(coreExportTask.getId());
        });

    }

}

