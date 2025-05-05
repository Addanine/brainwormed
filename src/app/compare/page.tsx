// Redesign: Use custom MeasurementSelect for readable, searchable measurement selection. All UI lowercase. Fix mutation error by passing mutationFn to useMutation.
"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller, type FieldValues, type Control } from "react-hook-form";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { MeasurementSelect } from "../../components/ui/measurement-select";
import { useMutation } from "@tanstack/react-query";

const DATASETS = [
  { label: "civilian (nhanes)", value: "nhanes" },
  { label: "military (ansur ii)", value: "ansur2" },
  { label: "both", value: "" },
];

type Metric = { name: string; value: number | "" };

type ProfileForm = {
  label: string;
  metrics: Metric[];
};

type FormShape = {
  dataset: string;
  profiles: ProfileForm[];
};

type CompareResponse = {
  results: {
    label: string;
    stats: {
      [metric: string]: {
        z_female: number;
        pct_female: number;
        z_male: number;
        pct_male: number;
      };
    };
  }[];
  scatter_png: string | null;
  hist_png: string | null;
};

const defaultProfile = (columns: string[]): ProfileForm => ({
  label: "",
  metrics: [
    { name: columns[0] ?? "", value: "" },
    { name: columns[1] ?? "", value: "" },
  ],
});

function toReadableLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/([A-Z]+)/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim();
}

export default function ComparePage() {
  const [dataset, setDataset] = useState<string>(DATASETS[0].value);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnError, setColumnError] = useState<string | null>(null);

  useEffect(() => {
    setColumns([]);
    setColumnError(null);
    fetch(
      `https://api.brainwormed.lgbt/columns${dataset ? `?source=${dataset}` : ""}`
    )
      .then((r) => {
        if (!r.ok) throw new Error("failed to fetch columns");
        return r.json();
      })
      .then((cols) => setColumns(cols))
      .catch((e) => setColumnError(e.message));
  }, [dataset]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<FormShape>({
    defaultValues: {
      dataset: DATASETS[0].value,
      profiles: [defaultProfile([])],
    },
  });

  useEffect(() => {
    if (columns.length > 1) {
      reset({
        dataset,
        profiles: [defaultProfile(columns)],
      });
    }
  }, [columns, dataset, reset]);

  const { fields: profileFields, append, remove } = useFieldArray({
    control,
    name: "profiles",
  });

  // Add/remove metric rows per profile
  const addMetric = (profileIdx: number) => {
    const current = watch(`profiles.${profileIdx}.metrics`);
    const unused = columns.filter(
      (col) => !current.some((m: Metric) => m.name === col)
    );
    setValue(
      `profiles.${profileIdx}.metrics`,
      [...current, { name: unused[0] ?? "", value: "" }]
    );
  };
  const removeMetric = (profileIdx: number, metricIdx: number) => {
    const current = watch(`profiles.${profileIdx}.metrics`);
    if (current.length > 2) {
      setValue(
        `profiles.${profileIdx}.metrics`,
        current.filter((_: any, i: number) => i !== metricIdx)
      );
    }
  };

  const mutation = useMutation<CompareResponse, Error, { dataset: string; profiles: ProfileForm[] }>({
    mutationFn: async ({ dataset, profiles }: { dataset: string; profiles: ProfileForm[] }) => {
      const payload = {
        profiles: profiles.map((p: ProfileForm) => ({
          label: p.label,
          values: Object.fromEntries(
            p.metrics.filter((m: Metric) => m.value !== "" && !isNaN(Number(m.value))).map((m: Metric) => [m.name, Number(m.value)])
          ),
        })),
      };
      const url = `https://api.brainwormed.lgbt/compare${dataset ? `?source=${dataset}` : ""}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "api error");
      }
      return res.json();
    }
  });

  return (
    <div className="min-h-screen w-full bg-black text-white font-mono text-base">
      <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto">
        {/* Left info panel */}
        <aside className="w-full md:w-1/3 p-6 border-r-4 border-black flex flex-col gap-8 min-h-screen justify-start" style={{background: '#111'}}>
          <h2 className="text-2xl font-bold uppercase mb-4 tracking-widest">input measurements</h2>
          <div className="text-white text-base mb-6 whitespace-pre-line">
            make sure you have the spelling right, if you mispell something the chart won't show.
            
            tip: always click on the drop down of the measurement you want to use, that way you can guarantee that it is spelled right.
          </div>
          <div className="flex flex-col gap-2">
            <label className="uppercase">dataset</label>
            <select
              className="border-2 border-black bg-black text-white px-3 py-2 focus:outline-none"
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
            >
              {DATASETS.map((d) => (
                <option key={d.value} value={d.value} className="bg-black text-white">
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => append(defaultProfile(columns))}
              className="border-2 border-black bg-black text-white uppercase"
            >
              add profile
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset({ dataset, profiles: [defaultProfile(columns)] })}
              className="border-2 border-black bg-black text-white uppercase"
            >
              reset
            </Button>
          </div>
          {columnError && <div className="text-red-600 font-mono uppercase border-2 border-black p-2 mt-4">{columnError}</div>}
        </aside>
        {/* Main content: form, graph, results */}
        <main className="flex-1 p-6 flex flex-col gap-8 min-h-screen">
          <form
            onSubmit={handleSubmit((data) => mutation.mutate({ dataset, profiles: data.profiles }))}
            className="space-y-8"
          >
            {profileFields.map((profile, pIdx) => (
              <div key={profile.id} className="border-2 border-black p-4 mb-4 bg-black">
                <div className="flex gap-2 items-end mb-2">
                  <Controller
                    control={control as Control<FormShape>}
                    name={`profiles.${pIdx}.label` as const}
                    render={({ field }) => (
                      <Input {...field} placeholder="label" className="w-40 font-mono lowercase border-2 border-black bg-black text-white" />
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => remove(pIdx)}
                    className="ml-2 border-2 border-black bg-black text-white lowercase"
                    disabled={profileFields.length === 1}
                  >
                    remove
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  {watch(`profiles.${pIdx}.metrics`).map((metric: Metric, mIdx: number) => (
                    <div key={metric.name + mIdx} className="flex gap-2 items-center">
                      <Controller
                        control={control as Control<FormShape>}
                        name={`profiles.${pIdx}.metrics.${mIdx}.name` as const}
                        render={({ field }) => (
                          <MeasurementSelect
                            options={columns}
                            value={field.value}
                            onChange={field.onChange}
                            className="w-48"
                          />
                        )}
                      />
                      <Controller
                        control={control as Control<FormShape>}
                        name={`profiles.${pIdx}.metrics.${mIdx}.value` as const}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            placeholder="value"
                            className="w-28 font-mono lowercase border-2 border-black bg-black text-white"
                          />
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeMetric(pIdx, mIdx)}
                        className="ml-1 border-2 border-black bg-black text-white lowercase"
                        disabled={watch(`profiles.${pIdx}.metrics`).length <= 2}
                      >
                        remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addMetric(pIdx)}
                    className="mt-2 w-fit border-2 border-black bg-black text-white lowercase"
                    disabled={watch(`profiles.${pIdx}.metrics`).length >= columns.length}
                  >
                    add measurement
                  </Button>
                </div>
              </div>
            ))}
            <Button type="submit" disabled={mutation.isPending} className="border-2 border-black bg-black text-white lowercase w-full py-3 text-lg">
              {mutation.isPending ? "comparing…" : "compare"}
            </Button>
          </form>
          {mutation.isSuccess && mutation.data && (
            <div className="flex flex-col md:flex-row gap-8 mt-10">
              {/* Graph/scale area */}
              <div className="flex-1 flex flex-col items-center border-4 border-black bg-black p-4 shadow-[8px_8px_0_0_#000]">
                {(mutation.data.scatter_png || mutation.data.hist_png) ? (
                  <>
                    {mutation.data.scatter_png && (
                      <img
                        src={`data:image/png;base64,${mutation.data.scatter_png}`}
                        alt="scatter plot"
                        className="rounded border-4 border-black shadow-[8px_8px_0_0_#000] max-w-full mb-6"
                      />
                    )}
                    {mutation.data.hist_png && (
                      <img
                        src={`data:image/png;base64,${mutation.data.hist_png}`}
                        alt="histogram"
                        className="rounded border-4 border-black shadow-[8px_8px_0_0_#000] max-w-full"
                      />
                    )}
                  </>
                ) : (
                  <div className="text-gray-400 font-mono lowercase">no plot available for selected metrics</div>
                )}
                {/* Male-female scale (visual axis) */}
                <div className="w-full flex items-center justify-between mt-8">
                  <span className="font-mono lowercase text-xs">male</span>
                  <div className="flex-1 h-2 mx-2 bg-gradient-to-r from-blue-900 via-gray-400 to-pink-900 rounded-full border-2 border-black relative">
                    {/* Optionally, you could add a marker for the user's position here */}
                  </div>
                  <span className="font-mono lowercase text-xs">female</span>
                </div>
              </div>
              {/* Results table */}
              <div className="flex-1 overflow-x-auto border-4 border-black bg-black p-4 shadow-[8px_8px_0_0_#000]">
                <table className="min-w-full text-xs text-left border-4 border-black bg-black text-white">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 font-mono lowercase border-2 border-black">label</th>
                      {columns.map((col) => (
                        <th key={col} className="px-3 py-2 font-mono lowercase border-2 border-black" colSpan={4}>{toReadableLabel(col)}</th>
                      ))}
                    </tr>
                    <tr>
                      <th className="border-2 border-black"></th>
                      {columns.map((col) => [
                        <th key={col+"-zf"} className="px-2 py-1 font-mono lowercase border-2 border-black">z_female</th>,
                        <th key={col+"-pf"} className="px-2 py-1 font-mono lowercase border-2 border-black">%_female</th>,
                        <th key={col+"-zm"} className="px-2 py-1 font-mono lowercase border-2 border-black">z_male</th>,
                        <th key={col+"-pm"} className="px-2 py-1 font-mono lowercase border-2 border-black">%_male</th>,
                      ])}
                    </tr>
                  </thead>
                  <tbody>
                    {mutation.data.results.map((r) => (
                      <tr key={r.label} className="border-t-4 border-black">
                        <td className="px-3 py-2 font-mono border-2 border-black bg-black text-white">{r.label}</td>
                        {columns.map((col) => {
                          const stat = r.stats[col];
                          return stat ? [
                            <td key={col+"-zf"} className="px-2 py-1 font-mono border-2 border-black bg-black text-white">{stat.z_female?.toFixed(2)}</td>,
                            <td key={col+"-pf"} className="px-2 py-1 font-mono border-2 border-black bg-black text-white">{stat.pct_female?.toFixed(2)}</td>,
                            <td key={col+"-zm"} className="px-2 py-1 font-mono border-2 border-black bg-black text-white">{stat.z_male?.toFixed(2)}</td>,
                            <td key={col+"-pm"} className="px-2 py-1 font-mono border-2 border-black bg-black text-white">{stat.pct_male?.toFixed(2)}</td>,
                          ] : [
                            <td key={col+"-zf"} colSpan={4} className="text-gray-400 text-center font-mono border-2 border-black">—</td>
                          ];
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {mutation.isError && (
            <div className="mt-6 text-red-600 font-mono lowercase border-2 border-black p-2 text-center">
              error: {mutation.error.message}
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 