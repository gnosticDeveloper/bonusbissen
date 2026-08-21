import { getRewards } from "@/app/rewards.actions";
import RewardsList from "@/components/rewards-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const MAX_POINTS = 1_000_000;

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = (await searchParams).query;

  const rewards = await getRewards(query);

  const user = {
    name: "PLACEHOLDER",
    role: "ADMIN",
  };
  const isAdmin = user.role === "ADMIN";

  // const notify = useToast();
  // const [editing, setEditing] = useState<Reward | null>(null);
  // const [creating, setCreating] = useState(false);
  // const [removing, setRemoving] = useState<Reward | null>(null);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">Recompensas</h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Creá, editá y eliminá las recompensas que tus clientes pueden canjear."
              : "Catálogo de recompensas disponibles (solo lectura)."}
          </p>
        </div>
        {isAdmin ? (
          <Button
            // onClick={() => {
              // setCreating(true)
            // }}
          >
            <Plus className="size-4" /> Nueva recompensa
          </Button>
        ) : null}
      </div>

      <RewardsList rewards={rewards} isAdmin={isAdmin} />

      {/*{(creating || editing) && isAdmin ? (
        <RewardForm
          reward={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(msg) => {
            setCreating(false);
            setEditing(null);
            notify(msg);
          }}
        />
      ) : null}*/}

      {/*<Modal
        // open={!!removing}
        open={false}
        onClose={() => {
          // setRemoving(null);
        }}
        title="Eliminar recompensa"
        description="Los canjes ya realizados no se verán afectados."
      >
        {removing ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              ¿Seguro que querés eliminar <span className="font-semibold text-foreground">{removing.title}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoving(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteReward(removing.id);
                  notify("Recompensa eliminada.");
                  setRemoving(null);
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>*/}
    </div>
  );
}

// function RewardForm({ reward, onClose, onSaved }: { reward: Reward | null; onClose: () => void; onSaved: (message: string) => void }) {
//   const [title, setTitle] = useState(reward?.title ?? "");
//   const [description, setDescription] = useState(reward?.description ?? "");
//   const [discountValue, setDiscountValue] = useState(reward?.discountValue ?? "");
//   const [points, setPoints] = useState(reward ? String(reward.pointsRequired) : "");
//   const [imageQuery, setImageQuery] = useState("");
//   const [errors, setErrors] = useState<Record<string, string | null>>({});

//   function save() {
//     const next: Record<string, string | null> = {
//       title: validateRequired(title, "El título", MAX_TITLE_LENGTH),
//       description: validateRequired(description, "La descripción", 280),
//       discountValue: validateRequired(discountValue, "El valor del descuento", 24),
//       points: parsePositiveInt(points, { max: MAX_POINTS }) ? null : "Ingresá los puntos requeridos (número entero mayor a 0).",
//     };
//     setErrors(next);
//     if (Object.values(next).some(Boolean)) return;

//     const query = sanitizeText(imageQuery) || sanitizeText(title);
//     const imageUrl = reward && !imageQuery.trim() ? reward.imageUrl : `/placeholder.svg?height=320&width=480&query=${encodeURIComponent(query)}`;

//     const payload = {
//       title: sanitizeText(title),
//       description: sanitizeText(description),
//       discountValue: sanitizeText(discountValue),
//       pointsRequired: parsePositiveInt(points, { max: MAX_POINTS })!,
//       imageUrl,
//     };
//     if (reward) {
//       updateReward(reward.id, payload);
//       onSaved("Recompensa actualizada.");
//     } else {
//       addReward(payload);
//       onSaved("Recompensa creada.");
//     }
//   }

//   return (
//     <Modal
//       open
//       onClose={onClose}
//       title={reward ? "Editar recompensa" : "Nueva recompensa"}
//       description="Completá los datos de la recompensa. La imagen se genera como placeholder."
//     >
//       <div className="flex flex-col gap-4">
//         <div className="flex flex-col gap-1.5">
//           <Label htmlFor="r-title">Título</Label>
//           <Input
//             id="r-title"
//             maxLength={MAX_TITLE_LENGTH}
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             placeholder="Ej: Café de cortesía"
//           />
//           <FieldError message={errors.title} />
//         </div>
//         <div className="flex flex-col gap-1.5">
//           <Label htmlFor="r-desc">Descripción</Label>
//           <Textarea
//             id="r-desc"
//             maxLength={280}
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             placeholder="Describí en qué consiste la recompensa"
//           />
//           <FieldError message={errors.description} />
//         </div>
//         <div className="grid grid-cols-2 gap-3">
//           <div className="flex flex-col gap-1.5">
//             <Label htmlFor="r-discount">Valor del descuento</Label>
//             <Input
//               id="r-discount"
//               maxLength={24}
//               value={discountValue}
//               onChange={(e) => setDiscountValue(e.target.value)}
//               placeholder="Ej: 20% OFF"
//             />
//             <FieldError message={errors.discountValue} />
//           </div>
//           <div className="flex flex-col gap-1.5">
//             <Label htmlFor="r-points">Puntos requeridos</Label>
//             <Input
//               id="r-points"
//               inputMode="numeric"
//               value={points}
//               onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ""))}
//               placeholder="Ej: 300"
//             />
//             <FieldError message={errors.points} />
//           </div>
//         </div>
//         <div className="flex flex-col gap-1.5">
//           <Label htmlFor="r-image">Descripción de la imagen (opcional)</Label>
//           <Input
//             id="r-image"
//             maxLength={80}
//             value={imageQuery}
//             onChange={(e) => setImageQuery(e.target.value)}
//             placeholder="Se usa para generar el placeholder"
//           />
//         </div>
//         <div className="flex justify-end gap-2">
//           <Button variant="outline" onClick={onClose}>
//             Cancelar
//           </Button>
//           <Button onClick={save}>{reward ? "Guardar cambios" : "Crear recompensa"}</Button>
//         </div>
//       </div>
//     </Modal>
//   );
// }
