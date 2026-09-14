import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

export interface KecamatanStatItem {
  id: number;
  nama: string;
  parent_nama?: string;
  total_kerugian: number;
  total_meninggal: number;
  total_luka: number;
  jumlah_kejadian: number;
  tingkat_risiko: string;
}

interface StatistikChartProps {
  data: KecamatanStatItem[];
  selectedWilayahId: number | null;
  onSelectKecamatan: (id: number, nama: string) => void;
}

export const StatistikChart: React.FC<StatistikChartProps> = ({
  data,
  selectedWilayahId,
  onSelectKecamatan,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Urutkan data berdasarkan total kerugian terbesar (Top 10 untuk kejelasan visual)
  const topData = [...data]
    .sort((a, b) => b.total_kerugian - a.total_kerugian)
    .slice(0, 10)
    .reverse(); // Reverse untuk horizontal bar chart agar urutan tertinggi di atas

  useEffect(() => {
    if (!chartRef.current || isCollapsed) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'canvas',
      });

      chartInstance.current.on('click', (params: any) => {
        if (params.data && params.data.wilayahId) {
          onSelectKecamatan(params.data.wilayahId, params.data.nama);
        }
      });
    }

    const categories = topData.map((d) => d.nama);
    const values = topData.map((d) => ({
      value: d.total_kerugian,
      wilayahId: d.id,
      nama: d.nama,
      meninggal: d.total_meninggal,
      kejadian: d.jumlah_kejadian,
      itemStyle: {
        color:
          d.id === selectedWilayahId
            ? '#F39C12'
            : d.total_kerugian >= 1_500_000_000
            ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#C0392B' },
                { offset: 1, color: '#E74C3C' },
              ])
            : d.total_kerugian >= 400_000_000
            ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#D98E04' },
                { offset: 1, color: '#F39C12' },
              ])
            : new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#1E7A46' },
                { offset: 1, color: '#2ECC71' },
              ]),
        borderRadius: [0, 4, 4, 0],
        borderWidth: d.id === selectedWilayahId ? 2 : 0,
        borderColor: '#FFFFFF',
      },
    }));

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animationDuration: 400,
      grid: {
        left: '2%',
        right: '12%',
        top: '8%',
        bottom: '8%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 32, 0.95)',
        borderColor: '#3A5A82',
        borderWidth: 1,
        textStyle: {
          color: '#E8ECF1',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
        },
        formatter: (params: any) => {
          const item = params.data;
          const nominal = Number(item.value);
          let formattedRp = `Rp ${(nominal / 1_000_000_000).toFixed(2)} Miliar`;
          if (nominal < 1_000_000_000) {
            formattedRp = `Rp ${(nominal / 1_000_000).toFixed(0)} Juta`;
          }
          return `
            <div style="padding: 2px 4px;">
              <div style="font-weight: 700; color: #FFFFFF; font-size: 13px; margin-bottom: 4px;">${item.nama}</div>
              <div style="color: #F39C12; font-weight: 600; font-family: monospace;">Kerugian: ${formattedRp}</div>
              <div style="color: #94A3B8; font-size: 11px; margin-top: 4px;">
                Korban Jiwa: <b style="color: ${item.meninggal > 0 ? '#E74C3C' : '#CBD5E1'}">${item.meninggal}</b> &bull; Kejadian: <b>${item.kejadian}</b>
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: '#2D3F52',
            type: 'dashed',
          },
        },
        axisLabel: {
          color: '#64748B',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          formatter: (value: number) => {
            if (value >= 1_000_000_000) {
              return `${(value / 1_000_000_000).toFixed(1)}M`;
            }
            if (value >= 1_000_000) {
              return `${(value / 1_000_000).toFixed(0)}Jt`;
            }
            return `${value}`;
          },
        },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#2D3F52' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#CBD5E1',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          formatter: (val: string) => {
            return val.length > 14 ? val.substring(0, 13) + '…' : val;
          },
        },
      },
      series: [
        {
          name: 'Total Kerugian',
          type: 'bar',
          barWidth: 14,
          data: values,
          label: {
            show: true,
            position: 'right',
            color: '#94A3B8',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            formatter: (p: any) => {
              const val = Number(p.value);
              if (val >= 1_000_000_000) {
                return `${(val / 1_000_000_000).toFixed(1)}M`;
              }
              if (val >= 1_000_000) {
                return `${(val / 1_000_000).toFixed(0)}Jt`;
              }
              return '';
            },
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [topData, selectedWilayahId, isCollapsed, onSelectKecamatan]);

  return (
    <div
      className={`absolute bottom-16 left-4 z-20 bg-[#1B2733]/95 backdrop-blur-xl border border-[#2D3F52] rounded-xl shadow-2xl text-slate-100 transition-all duration-300 overflow-hidden ${
        isCollapsed ? 'w-64 h-11' : 'w-88 sm:w-96 h-76'
      }`}
    >
      {/* Header Bar */}
      <div className="h-11 px-3.5 border-b border-[#2D3F52] bg-[#0F1720]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold font-display tracking-wider uppercase text-slate-200">
            Top Kerugian Wilayah
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1E3A5F] text-blue-200 border border-[#3A5A82]/50">
            ECharts
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#2D3F52] transition-colors"
            title={isCollapsed ? 'Perbesar Grafik' : 'Perkecil Grafik'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Konten ECharts */}
      {!isCollapsed && (
        <div className="relative w-full h-[calc(100%-2.75rem)] p-2">
          {topData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
              Tidak ada data kerugian tercatat
            </div>
          ) : (
            <div ref={chartRef} className="w-full h-full" />
          )}
        </div>
      )}
    </div>
  );
};
