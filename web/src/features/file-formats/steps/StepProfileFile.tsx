import type { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type StepProfileFileProps = {
  profileName: string;
  onProfileNameChange: (value: string) => void;
  fileName: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function StepProfileFile({ profileName, onProfileNameChange, fileName, onFileChange }: StepProfileFileProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="profile-name">Profile Name</Label>
        <Input
          id="profile-name"
          value={profileName}
          onChange={(event) => onProfileNameChange(event.target.value)}
          placeholder="Example: BBVA Checking XLS"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="statement-file">Statement File</Label>
        <Input id="statement-file" type="file" accept=".csv,.xls,.xlsx" onChange={onFileChange} />
        <p className="text-xs text-muted-foreground">{fileName || 'No file selected'}</p>
      </div>
    </div>
  );
}
