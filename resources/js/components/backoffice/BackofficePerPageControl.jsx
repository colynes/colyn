import React from 'react';

export default function BackofficePerPageControl({
  options = [50, 100, 250, 500],
  value = 50,
  name = 'per_page',
  onChange,
  className = '',
}) {
  return (
    <label className={`inline-flex items-center gap-3 text-[0.98rem] font-semibold text-[#4f3118] ${className}`}>
      <span>Show</span>
      <select
        name={name}
        value={String(value)}
        onChange={onChange}
        className="h-12 min-w-[154px] rounded-[1rem] border border-[#dcccba] bg-white px-4 text-[1rem] font-medium text-[#3a2513] outline-none transition focus:border-[#b69066]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
